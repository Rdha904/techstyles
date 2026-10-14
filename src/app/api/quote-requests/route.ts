import { api, body } from "@/lib/api";
import { repository } from "@/lib/repository";
import { currentWorkspaceId } from "@/lib/workspace";
import { createQuoteRequest } from "@/lib/quote-requests";

export function GET(request: Request) {
  return api(async () => {
    const data = await repository.read(await currentWorkspaceId());
    const productId = new URL(request.url).searchParams.get("productId");
    return productId === null
      ? data.quoteRequests
      : data.quoteRequests.filter((item) => item.productId === productId);
  });
}
export function POST(request: Request) {
  return api(async () => {
    const input = await body(request);
    return repository.update(await currentWorkspaceId(), (data) =>
      createQuoteRequest(data, input),
    );
  });
}
