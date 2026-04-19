import { getPool } from '../db/pool';
import { getPostEngagement } from '../services/facebook';

export interface EngagementRecord {
  id: string;
  postRecordId: string;
  facebookPostId: string;
  reactions: number;
  comments: number;
  shares: number;
  reach: number;
  snapshotAt: Date;
}

interface DbPostRecordRow {
  id: number;
  facebook_post_id: string | null;
  published_at: Date;
}

interface DbEngagementRow {
  id: number;
  post_record_id: number;
  facebook_post_id: string;
  likes: number;
  comments: number;
  shares: number;
  reach: number;
  snapshot_at: Date;
}

function rowToEngagementRecord(row: DbEngagementRow): EngagementRecord {
  return {
    id: String(row.id),
    postRecordId: String(row.post_record_id),
    facebookPostId: row.facebook_post_id,
    reactions: row.likes,
    comments: row.comments,
    shares: row.shares,
    reach: row.reach,
    snapshotAt: row.snapshot_at,
  };
}

/**
 * Fetches engagement metrics for a published post and persists an EngagementRecord.
 *
 * Loads PostRecord by id, calls the Facebook Graph API for engagement,
 * writes the snapshot to engagement_records, and returns the record.
 */
export async function snapshotEngagement(postRecordId: string): Promise<EngagementRecord> {
  const pool = getPool();

  const postResult = await pool.query<DbPostRecordRow>(
    `SELECT id, facebook_post_id, published_at FROM post_records WHERE id = $1`,
    [Number(postRecordId)]
  );

  if (postResult.rows.length === 0) {
    throw new Error(`PostRecord with id ${postRecordId} not found.`);
  }

  const postRow = postResult.rows[0];

  if (!postRow.facebook_post_id) {
    throw new Error(
      `PostRecord ${postRecordId} has no facebook_post_id — cannot fetch engagement.`
    );
  }

  const engagement = await getPostEngagement(postRow.facebook_post_id);

  const insertResult = await pool.query<DbEngagementRow>(
    `INSERT INTO engagement_records
       (post_record_id, facebook_post_id, likes, comments, shares, reach)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, post_record_id, facebook_post_id, likes, comments, shares, reach, snapshot_at`,
    [
      Number(postRecordId),
      postRow.facebook_post_id,
      engagement.reactions,
      engagement.comments,
      engagement.shares,
      engagement.reach,
    ]
  );

  return rowToEngagementRecord(insertResult.rows[0]);
}
