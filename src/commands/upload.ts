import type { IssueUploadResult } from '../git/issue-uploader.js';
import { uploadIssues } from '../git/issue-uploader.js';

/** 上传工作区 issues 并返回远端分支信息。 */
export async function uploadProjectIssues(
  workspacePath: string,
  issueName: string,
  remoteName = 'origin'
): Promise<IssueUploadResult> {
  return uploadIssues(workspacePath, issueName, remoteName);
}
