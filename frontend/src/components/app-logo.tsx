import * as React from "react";
const CondominiumIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    width={256}
    height={256}
    viewBox="0 0 128 128"
    xmlns="http://www.w3.org/2000/svg"
    role="img"
    aria-label="Condominio"
    {...props}
  >
    <title>{"Condominio"}</title>
    <defs>
      <style>
        {
          "\n      .blue { fill:#1D4ED8; }\n      .white { fill:#FFFFFF; }\n    "
        }
      </style>
    </defs>
    <rect x={8} y={102} width={112} height={8} className="blue" rx={2} />
    <rect x={16} y={44} width={28} height={58} className="blue" rx={3} />
    <rect x={22} y={52} width={6} height={6} className="white" rx={1} />
    <rect x={32} y={52} width={6} height={6} className="white" rx={1} />
    <rect x={22} y={64} width={6} height={6} className="white" rx={1} />
    <rect x={32} y={64} width={6} height={6} className="white" rx={1} />
    <rect x={22} y={76} width={6} height={6} className="white" rx={1} />
    <rect x={32} y={76} width={6} height={6} className="white" rx={1} />
    <rect x={50} y={28} width={28} height={74} className="blue" rx={3} />
    <rect x={56} y={36} width={6} height={6} className="white" rx={1} />
    <rect x={66} y={36} width={6} height={6} className="white" rx={1} />
    <rect x={56} y={48} width={6} height={6} className="white" rx={1} />
    <rect x={66} y={48} width={6} height={6} className="white" rx={1} />
    <rect x={56} y={60} width={6} height={6} className="white" rx={1} />
    <rect x={66} y={60} width={6} height={6} className="white" rx={1} />
    <rect x={56} y={72} width={6} height={6} className="white" rx={1} />
    <rect x={66} y={72} width={6} height={6} className="white" rx={1} />
    <rect x={60} y={84} width={8} height={18} className="white" rx={1.5} />
    <rect x={84} y={52} width={28} height={50} className="blue" rx={3} />
    <rect x={90} y={60} width={6} height={6} className="white" rx={1} />
    <rect x={100} y={60} width={6} height={6} className="white" rx={1} />
    <rect x={90} y={72} width={6} height={6} className="white" rx={1} />
    <rect x={100} y={72} width={6} height={6} className="white" rx={1} />
    <rect x={90} y={84} width={6} height={6} className="white" rx={1} />
    <rect x={100} y={84} width={6} height={6} className="white" rx={1} />
    <circle cx={22} cy={100} r={6} className="blue" />
  </svg>
);
export default CondominiumIcon;