import { ActivityList } from "../components/Layout";
import { useLive } from "../live";

export function ActivityPage() {
  const { activities } = useLive();
  return (
    <>
      <p className="muted">Latest 20 events you are allowed to see. New ones appear instantly.</p>
      <div className="card">
        <ActivityList items={activities.slice(0, 20)} />
      </div>
    </>
  );
}
