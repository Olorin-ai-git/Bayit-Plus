/**
 * Consumer Submission Services — Authenticated video URL submission
 *
 * Submit video URLs for character extraction, list past submissions,
 * and poll extraction status.
 */

import { api } from "./client";

export interface SubmitUrlResponse {
  job_id: string;
  status: string;
  priority: number;
  queued: boolean;
}

export interface SubmissionStatus {
  job_id: string;
  status: "pending" | "extracting" | "ready" | "failed";
  content_id: string | null;
  video_title: string | null;
  character_count: number;
  error: string | null;
}

export interface SubmissionListItem {
  job_id: string;
  status: "pending" | "extracting" | "ready" | "failed";
  url: string;
  content_id: string | null;
  video_title: string | null;
  character_count: number;
  created_at: string;
}

export const submissionService = {
  submitUrl: (url: string) =>
    api.post<SubmitUrlResponse>("/consumer/submit-url", { url }),

  listSubmissions: () => api.get<SubmissionListItem[]>("/consumer/submissions"),

  getStatus: (jobId: string) =>
    api.get<SubmissionStatus>(`/consumer/submissions/${jobId}`),
};
