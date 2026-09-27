<!-- :BEGIN -->
> [!IMPORTANT]
> This project is connected to [](https://.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on 's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to  and show up in
> the editor, so keep the branch in a working state.
<!-- :END -->

- SENTINEL uses the uploaded assessment workspace as its demo-data foundation; this preserves working security workflows without claiming live telemetry.
- The command-center overview is isolated in `sentinel-overview.tsx` while detailed workflows retain their file routes; this keeps the one-page view focused and detail actions navigable.
