#!/usr/bin/env node
import { FacebookPublisher } from "./facebook-publisher.js";
import { FacebookTokenManager } from "./token-manager.js";

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

    default:
      console.error("Commands: verify, text, photo, insights, token-check, token-debug");
      process.exit(1);
  }
}

main().catch((err) => {
  console.error("Error:", err.message);
  if (err.statusCode) console.error("HTTP status:", err.statusCode);
  if (err.code) console.error("FB error code:", err.code);
  process.exit(1);
});
