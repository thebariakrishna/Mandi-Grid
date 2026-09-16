import { useEffect, useState, type DependencyList } from "react";
import type { LoadState } from "@/types/analytics";

/**
 * Runs an async loader and tracks loading/error/ready state.
 * Loaders are cached at the fetch layer (see data/loaders), so remounting a
 * page or re-running the same query resolves instantly instead of re-fetching.
 */
export function useAsyncData<T>(loader: () => Promise<T>, deps: DependencyList = []): LoadState<T> {
  const [state, setState] = useState<LoadState<T>>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    setState({ status: "loading" });

    loader()
      .then((data) => {
        if (!cancelled) setState({ status: "ready", data });
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setState({
            status: "error",
            message: err instanceof Error ? err.message : "Data unavailable",
          });
        }
      });

    return () => {
      cancelled = true;
    };
    // deps intentionally control re-fetching; loader identity is expected to be stable per call site
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return state;
}
