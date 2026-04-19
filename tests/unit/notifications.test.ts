import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('https', () => {
  const mockWrite = vi.fn();
  const mockEnd = vi.fn();
  const mockResume = vi.fn();
  const mockOn = vi.fn();

  return {
    request: vi.fn((_opts: unknown, cb: (res: { statusCode: number; resume: () => void }) => void) => {
      const req = { on: mockOn, write: mockWrite, end: mockEnd };
      setTimeout(() => cb({ statusCode: 200, resume: mockResume }), 0);
      return req;
    }),
    __mockWrite: mockWrite,
    __mockEnd: mockEnd,
    __mockOn: mockOn,
  };
});

import * as httpsModule from 'https';
import { notifySlack } from '../../src/services/notifications';

describe('notifySlack', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv, SLACK_WEBHOOK_URL: 'https://hooks.slack.com/test/webhook' };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('sends a POST request to the Slack webhook for run_start', async () => {
    await notifySlack({ event: 'run_start', date: '2026-04-19', sourceUrl: 'https://bbc.com/article' });

    expect(httpsModule.request).toHaveBeenCalledOnce();
    const opts = vi.mocked(httpsModule.request).mock.calls[0][0] as { method: string; hostname: string };
    expect(opts.method).toBe('POST');
    expect(opts.hostname).toBe('hooks.slack.com');
  });

  it('includes full post body in approval_required message', async () => {
    let writtenPayload = '';
    vi.mocked(httpsModule.request).mockImplementationOnce((_opts: unknown, cb: (res: { statusCode: number; resume: () => void }) => void) => {
      const req = {
        on: vi.fn(),
        write: vi.fn((data: string) => { writtenPayload = data; }),
        end: vi.fn(),
      };
      setTimeout(() => cb({ statusCode: 200, resume: vi.fn() }), 0);
      return req as unknown as ReturnType<typeof httpsModule.request>;
    });

    await notifySlack({
      event: 'approval_required',
      draftId: '42',
      body: 'History post content here.',
      hashtags: ['NigerianHistory', 'Benin'],
      approvalUrl: 'https://github.com/actions/run/123',
    });

    const payload = JSON.parse(writtenPayload) as { text: string };
    expect(payload.text).toContain('draft ID: `42`');
    expect(payload.text).toContain('History post content here.');
    expect(payload.text).toContain('#NigerianHistory');
    expect(payload.text).toContain('https://github.com/actions/run/123');
  });

  it('does not throw when SLACK_WEBHOOK_URL is missing', async () => {
    delete process.env['SLACK_WEBHOOK_URL'];

    await expect(
      notifySlack({ event: 'run_start', date: '2026-04-19', sourceUrl: 'https://bbc.com/article' })
    ).resolves.toBeUndefined();

    expect(httpsModule.request).not.toHaveBeenCalled();
  });

  it('does not throw when the webhook returns a 4xx error', async () => {
    vi.mocked(httpsModule.request).mockImplementationOnce((_opts: unknown, cb: (res: { statusCode: number; resume: () => void }) => void) => {
      const req = { on: vi.fn(), write: vi.fn(), end: vi.fn() };
      setTimeout(() => cb({ statusCode: 400, resume: vi.fn() }), 0);
      return req as unknown as ReturnType<typeof httpsModule.request>;
    });

    await expect(
      notifySlack({ event: 'run_start', date: '2026-04-19', sourceUrl: 'https://bbc.com/article' })
    ).resolves.toBeUndefined();
  });

  it('does not throw when the request itself errors', async () => {
    vi.mocked(httpsModule.request).mockImplementationOnce(() => {
      const req = {
        on: vi.fn((event: string, handler: (e: Error) => void) => {
          if (event === 'error') {
            setTimeout(() => handler(new Error('ECONNREFUSED')), 0);
          }
        }),
        write: vi.fn(),
        end: vi.fn(),
      };
      return req as unknown as ReturnType<typeof httpsModule.request>;
    });

    await expect(
      notifySlack({ event: 'pipeline_error', errorMessage: 'Something broke' })
    ).resolves.toBeUndefined();
  });
});
