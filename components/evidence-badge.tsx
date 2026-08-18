import type { EvidenceStatus } from "@/lib/content/types";

const labels: Record<EvidenceStatus, string> = {
  verified: "已核验",
  "self-reported": "作者自评",
  unverified: "待核",
};

export function EvidenceBadge({ status }: { status: EvidenceStatus }) {
  return <span className={`evidence evidence--${status}`}><i aria-hidden="true" />{labels[status]}</span>;
}
