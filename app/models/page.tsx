import type { Metadata } from "next";
import { ComparisonTable } from "@/components/comparison-table";
import { getModels } from "@/lib/content";

export const metadata: Metadata = { title: "模型对比", description: "按接口、协议与字段级证据对比具身智能模型。" };

export default function ModelsPage() {
  return <main id="main-content"><header className="page-intro page-shell"><span className="eyebrow">MODEL INDEX</span><h1>先对齐接口与协议，<br />再谈模型差异。</h1><p>参数、动作表示和输入输出均保留字段级证据；协议不一致时禁止生成排名。</p></header><div className="page-section page-shell"><ComparisonTable caption="模型对比" records={getModels()} fields={[
    { key: "family", label: "类别" }, { key: "organization", label: "机构" }, { key: "license", label: "开放性" },
    { key: "protocol", label: "协议键" }, { key: "inputs", label: "输入", kind: "list" }, { key: "outputs", label: "输出", kind: "list" },
    { key: "parameters", label: "参数规模", kind: "fact" }, { key: "action_horizon", label: "动作跨度", kind: "fact" },
  ]} /></div></main>;
}
