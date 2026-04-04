import axios from "axios";

/** Extract `detail` from an Axios error response, falling back to the given message. */
export function getApiError(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    return err.response?.data?.detail || fallback;
  }
  return fallback;
}
