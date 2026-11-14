// SI-generated code: written by Claude (Anthropic) via Claude Code under team direction. Project idea: human (team).
import Gate from "@/components/Gate";
import Dashboard from "@/components/Dashboard";
import { CiteProvider } from "@/components/ui";

export default function Home() {
  return (
    <Gate>
      <CiteProvider>
        <Dashboard />
      </CiteProvider>
    </Gate>
  );
}
