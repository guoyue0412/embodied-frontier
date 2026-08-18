import type { Metadata } from "next";
import { ComparisonTable } from "@/components/comparison-table";
import { getDatasets } from "@/lib/content";

export const metadata: Metadata = { title: "数据集对比", description: "按规模、形态、许可与字段级证据对比机器人数据集。" };

export default function DatasetsPage() {
  return <main id="main-content"><header className="page-intro page-shell"><span className="eyebrow">DATASET INDEX</span><h1>规模不是一个数字，<br />而是一组采集协议。</h1><p>轨迹、环境和机器人形态保留单位与来源，不把异质数据直接折算成排行榜。</p></header><div className="page-section page-shell"><ComparisonTable caption="数据集对比" records={getDatasets()} fields={[
    { key: "organization", label: "机构" }, { key: "license", label: "许可" }, { key: "protocol", label: "协议键" },
    { key: "modalities", label: "模态", kind: "list" }, { key: "trajectories", label: "轨迹", kind: "fact" },
    { key: "embodiments", label: "本体", kind: "fact" }, { key: "environments", label: "环境", kind: "fact" },
  ]} /></div></main>;
}
