import { redirect } from "@node_modules/next/navigation";

export default function Home() {
  return redirect('/login');
}
