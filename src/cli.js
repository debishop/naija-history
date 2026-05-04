#!/usr/bin/env node
import { FacebookPublisher } from "./facebook-publisher.js";
import { FacebookTokenManager } from "./token-manager.js";
import { ImageGenerator, CANDIDATE_COUNT } from "./image-generator.js";
import { ApprovalWorkflow } from "./approval-workflow.js";

const publisher = FacebookPublisher.fromEnv();

const [, , command, ...args] = process.argv;

async function main() {
  switch (command) {
    case "verify": {
      const result = await publisher.verifyToken();
      console.log("Token valid:", result);
      break;
    }

    case "text": {
      const message = args.join(" ");
      if (!message) {
        console.error("Usage: cli.js text <message>");
        process.exit(1);
      }
      const result = await publisher.publishTextPost(message);
      console.log("Published text post:", result);
      break;
    }

    case "photo": {
      const [source, ...captionParts] = args;
      if (!source) {
        console.error("Usage: cli.js photo <url-or-path> [caption...]");
        process.exit(1);
      }
      const caption = captionParts.join(" ") || undefined;
      const isUrl = source.startsWith("http://") || source.startsWith("https://");
      const result = await publisher.publishPhoto(
        isUrl ? { imageUrl: source, caption } : { imagePath: source, caption }
      );
      console.log("Published photo:", result);
      break;
    }

    case "insights": {
      const [postId] = args;
      if (!postId) {
        console.error("Usage: cli.js insights <post-id>");
        process.exit(1);
      }
      const result = await publisher.getPostInsights(postId);
      console.log("Post insights:", JSON.stringify(result, null, 2));
      break;
    }

    case "token-check": {
      const tokenMgr = FacebookTokenManager.fromEnv();
      const health = await tokenMgr.checkTokenHealth();
      console.log(`Status: ${health.status}`);
      console.log(`Message: ${health.message}`);
      if (health.scopes) console.log(`Scopes: ${health.scopes.join(", ")}`);
      if (health.tokenCreatedAt) console.log(`Created: ${health.tokenCreatedAt.toISOString()}`);
      if (health.tokenAgeDays !== null) console.log(`Token age: ${health.tokenAgeDays} day(s)`);
      if (health.status !== "healthy") process.exit(1);
      break;
    }

    case "token-debug": {
      const tokenMgr2 = FacebookTokenManager.fromEnv();
      const debug = await tokenMgr2.getTokenDebugInfo();
      console.log(JSON.stringify(debug, null, 2));
      break;
    }

    case "generate-images": {
      const prompt = args.join(" ");
      if (!prompt) {
        console.error("Usage: cli.js generate-images <prompt>");
        process.exit(1);
      }
      const generator = ImageGenerator.fromEnv();
      const images = await generator.generateCandidates(prompt);
      console.log(`Generated ${images.length} image candidates:`);
      images.forEach((img) => {
        console.log(`  [${img.index + 1}] ${img.url}`);
        console.log(`      Prompt: ${img.revisedPrompt}`);
      });
      break;
    }

    case "approve-images": {
      const prompt = args.join(" ");
      if (!prompt) {
        console.error("Usage: cli.js approve-images <image-prompt>");
        console.error("  Generates 5 images and submits a Paperclip approval request.");
        console.error("  Requires: OPENAI_API_KEY, PAPERCLIP_API_URL, PAPERCLIP_API_KEY, PAPERCLIP_COMPANY_ID, PAPERCLIP_AGENT_ID");
        process.exit(1);
      }
      const workflow = ApprovalWorkflow.fromEnv();
      const result = await workflow.generateAndSubmit({
        prompt,
        postCaption: prompt,
        agentId: process.env.PAPERCLIP_AGENT_ID,
      });
      console.log(`Approval submitted: ${result.approvalId}`);
      console.log(`Status: ${result.status}`);
      console.log(`Generated ${result.images.length} candidates:`);
      result.images.forEach((img) => {
        console.log(`  [${img.index + 1}] ${img.url}`);
      });
      break;
    }

    case "check-approval": {
      const [approvalId] = args;
      if (!approvalId) {
        console.error("Usage: cli.js check-approval <approval-id>");
        process.exit(1);
      }
      const workflow = ApprovalWorkflow.fromEnv();
      const status = await workflow.checkApprovalStatus(approvalId);
      console.log(`Approval ${status.id}: ${status.status}`);
      if (status.resolvedAt) console.log(`Resolved at: ${status.resolvedAt}`);
      break;
    }

    case "upload-profile-picture": {
      const [source] = args;
      if (!source) {
        console.error("Usage: cli.js upload-profile-picture <url-or-path>");
        process.exit(1);
      }
      const isUrl = source.startsWith("http://") || source.startsWith("https://");
      const result = await publisher.uploadProfilePicture(
        isUrl ? { imageUrl: source } : { imagePath: source }
      );
      console.log("Profile picture uploaded:", result);
      break;
    }

    case "upload-cover-photo": {
      const [source] = args;
      if (!source) {
        console.error("Usage: cli.js upload-cover-photo <url-or-path>");
        process.exit(1);
      }
      const isUrl = source.startsWith("http://") || source.startsWith("https://");
      const result = await publisher.uploadCoverPhoto(
        isUrl ? { imageUrl: source } : { imagePath: source }
      );
      console.log("Cover photo uploaded:", result);
      break;
    }

    default:
      console.error("Commands: verify, text, photo, insights, token-check, token-debug, generate-images, approve-images, check-approval, upload-profile-picture, upload-cover-photo");
      process.exit(1);
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  if (err.statusCode) console.error("HTTP status:", err.statusCode);
  if (err.code) console.error("FB error code:", err.code);
  process.exit(1);
});
