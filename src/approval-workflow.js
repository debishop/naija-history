import { ImageGenerator, CANDIDATE_COUNT } from "./image-generator.js";

export class ApprovalWorkflow {
  #paperclipApiUrl;
  #paperclipApiKey;
  #companyId;
  #issueId;

  constructor({ paperclipApiUrl, paperclipApiKey, companyId, issueId }) {
    if (!paperclipApiUrl) throw new Error("paperclipApiUrl is required");
    if (!paperclipApiKey) throw new Error("paperclipApiKey is required");
    if (!companyId) throw new Error("companyId is required");
    this.#paperclipApiUrl = paperclipApiUrl;
    this.#paperclipApiKey = paperclipApiKey;
    this.#companyId = companyId;
    this.#issueId = issueId;
  }

  static fromEnv() {
    return new ApprovalWorkflow({
      paperclipApiUrl: process.env.PAPERCLIP_API_URL,
      paperclipApiKey: process.env.PAPERCLIP_API_KEY,
      companyId: process.env.PAPERCLIP_COMPANY_ID,
      issueId: process.env.PAPERCLIP_TASK_ID,
    });
  }

  async submitImageApproval({ images, postCaption, agentId }) {
    if (!images || !Array.isArray(images) || images.length === 0) {
      throw new Error("images must be a non-empty array");
    }
    if (!agentId) throw new Error("agentId is required");

    const imageSummary = images
      .map((img, i) => `**Option ${i + 1}:** [View image](${img.url})\n> ${img.revisedPrompt}`)
      .join("\n\n");

    const payload = {
      type: "request_board_approval",
      requestedByAgentId: agentId,
      issueIds: this.#issueId ? [this.#issueId] : [],
      payload: {
        title: "Approve image for social media post",
        summary: `${CANDIDATE_COUNT} image candidates have been generated for the following post. Please select one to approve for publishing.\n\n**Post caption:** ${postCaption || "(no caption)"}\n\n${imageSummary}`,
        recommendedAction: "Review all image options and approve the best one for the post.",
        risks: [
          "Image may not perfectly match brand tone — review carefully before approving.",
        ],
      },
    };

    const res = await fetch(`${this.#paperclipApiUrl}/api/companies/${this.#companyId}/approvals`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.#paperclipApiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(`Failed to create approval: ${JSON.stringify(data)}`);
    }

    return data;
  }

  async checkApprovalStatus(approvalId) {
    if (!approvalId) throw new Error("approvalId is required");

    const res = await fetch(`${this.#paperclipApiUrl}/api/approvals/${approvalId}`, {
      headers: {
        Authorization: `Bearer ${this.#paperclipApiKey}`,
      },
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(`Failed to check approval: ${JSON.stringify(data)}`);
    }

    return {
      id: data.id,
      status: data.status,
      resolvedAt: data.resolvedAt || null,
      payload: data.payload,
    };
  }

  async generateAndSubmit({ prompt, postCaption, agentId, size = "1024x1024" }) {
    const generator = ImageGenerator.fromEnv();
    const images = await generator.generateCandidates(prompt, { count: CANDIDATE_COUNT, size });

    const approval = await this.submitImageApproval({ images, postCaption, agentId });

    return {
      approvalId: approval.id,
      images,
      status: approval.status,
    };
  }
}
