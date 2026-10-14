import { api, body } from "@/lib/api";
import { repository } from "@/lib/repository";
import { currentWorkspaceId } from "@/lib/workspace";
import { deleteQuoteRequest, updateQuoteRequest } from "@/lib/quote-requests";

type Context = { params: Promise<{ id: string }> };
export function PATCH(request: Request, context: Context) {
  return api(async () => {
    const { id } = await context.params;
    const input = await body(request);
    return repository.update(await currentWorkspaceId(), (data) =>
      updateQuoteRequest(data, id, input),
    );
  });
}
export function DELETE(_request: Request, context: Context) {
  return api(async () => {
    const { id } = await context.params;
    return repository.update(await currentWorkspaceId(), (data) => {
      deleteQuoteRequest(data, id);
      return { ok: true };
    });
  });
}
