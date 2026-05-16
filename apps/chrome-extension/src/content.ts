export function readVisiblePageText(documentRef: Document = document): string {
  return documentRef.body?.innerText?.trim() ?? "";
}
