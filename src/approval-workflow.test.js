import { describe, it, mock, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import { ApprovalWorkflow } from "./approval-workflow.js";

describe("ApprovalWorkflow", () => {
  it("throws if required fields are missing", () => {
    assert.throws(() => new ApprovalWorkflow({}), /paperclipApiUrl is required/);
    assert.throws(
      () => new ApprovalWorkflow({ paperclipApiUrl: "http://localhost" }),
      /paperclipApiKey is required/
    );
    assert.throws(
      () => new ApprovalWorkflow({ paperclipApiUrl: "http://localhost", paperclipApiKey: "key" }),
      /companyId is required/
    );
  });

  it("fromEnv reads environment variables", () => {
    process.env.PAPERCLIP_API_URL = "http://localhost";
    process.env.PAPERCLIP_API_KEY = "key";
    process.env.PAPERCLIP_COMPANY_ID = "co-1";
    process.env.PAPERCLIP_TASK_ID = "task-1";
    const wf = ApprovalWorkflow.fromEnv();
    assert.ok(wf);
    delete process.env.PAPERCLIP_API_URL;
    delete process.env.PAPERCLIP_API_KEY;
    delete process.env.PAPERCLIP_COMPANY_ID;
    delete process.env.PAPERCLIP_TASK_ID;
  });

  describe("submitImageApproval", () => {
    let wf;
    let originalFetch;

    beforeEach(() => {
      wf = new ApprovalWorkflow({
        paperclipApiUrl: "http://localhost:3000",
        paperclipApiKey: "test-key",
        companyId: "co-123",
        issueId: "issue-456",
      });
      originalFetch = globalThis.fetch;
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it("rejects empty images array", async () => {
      await assert.rejects(() => wf.submitImageApproval({ images: [], agentId: "a1" }), /non-empty array/);
      await assert.rejects(() => wf.submitImageApproval({ images: null, agentId: "a1" }), /non-empty array/);
    });

    it("rejects missing agentId", async () => {
      await assert.rejects(
        () => wf.submitImageApproval({ images: [{ url: "http://img.com/1.png", revisedPrompt: "test" }] }),
        /agentId is required/
      );
    });

    it("submits approval request to Paperclip API", async () => {
      let capturedBody;
      globalThis.fetch = mock.fn(async (url, opts) => {
        assert.ok(url.includes("/api/companies/co-123/approvals"));
        capturedBody = JSON.parse(opts.body);
        return {
          ok: true,
          json: async () => ({ id: "approval-789", status: "pending" }),
        };
      });

      const images = [
        { url: "https://img.com/1.png", revisedPrompt: "prompt 1", index: 0 },
        { url: "https://img.com/2.png", revisedPrompt: "prompt 2", index: 1 },
      ];

      const result = await wf.submitImageApproval({
        images,
        postCaption: "Lagos in 1900",
        agentId: "agent-1",
      });

      assert.equal(result.id, "approval-789");
      assert.equal(capturedBody.type, "request_board_approval");
      assert.equal(capturedBody.requestedByAgentId, "agent-1");
      assert.deepEqual(capturedBody.issueIds, ["issue-456"]);
      assert.ok(capturedBody.payload.summary.includes("Option 1"));
      assert.ok(capturedBody.payload.summary.includes("Option 2"));
      assert.ok(capturedBody.payload.summary.includes("Lagos in 1900"));
    });

    it("throws on API error", async () => {
      globalThis.fetch = mock.fn(async () => ({
        ok: false,
        json: async () => ({ error: "Unauthorized" }),
      }));

      await assert.rejects(
        () =>
          wf.submitImageApproval({
            images: [{ url: "http://img.com/1.png", revisedPrompt: "test", index: 0 }],
            agentId: "a1",
          }),
        /Failed to create approval/
      );
    });
  });

  describe("checkApprovalStatus", () => {
    let wf;
    let originalFetch;

    beforeEach(() => {
      wf = new ApprovalWorkflow({
        paperclipApiUrl: "http://localhost:3000",
        paperclipApiKey: "test-key",
        companyId: "co-123",
      });
      originalFetch = globalThis.fetch;
    });

    afterEach(() => {
      globalThis.fetch = originalFetch;
    });

    it("rejects missing approvalId", async () => {
      await assert.rejects(() => wf.checkApprovalStatus(), /approvalId is required/);
    });

    it("returns approval status", async () => {
      globalThis.fetch = mock.fn(async (url) => {
        assert.ok(url.includes("/api/approvals/appr-1"));
        return {
          ok: true,
          json: async () => ({
            id: "appr-1",
            status: "approved",
            resolvedAt: "2026-05-01T12:00:00Z",
            payload: { title: "Approve image" },
          }),
        };
      });

      const result = await wf.checkApprovalStatus("appr-1");
      assert.equal(result.id, "appr-1");
      assert.equal(result.status, "approved");
      assert.equal(result.resolvedAt, "2026-05-01T12:00:00Z");
    });

    it("throws on API error", async () => {
      globalThis.fetch = mock.fn(async () => ({
        ok: false,
        json: async () => ({ error: "Not found" }),
      }));

      await assert.rejects(() => wf.checkApprovalStatus("bad-id"), /Failed to check approval/);
    });
  });
});
