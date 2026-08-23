const fs = require('fs');
let code = fs.readFileSync('src/components/dashboard/ProjectsList.tsx', 'utf8');

code = code.replace(/<span className="truncate">\{project\.name\}<\/span>/g, '<span className="truncate">{project.name}</span>\n                      {(project as any).isCoOwner && <span className="px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-medium tracking-wide">Co-Owner</span>}\n                      {(project as any).isManager && <span className="px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700 text-[10px] font-medium tracking-wide">Manager</span>}');

fs.writeFileSync('src/components/dashboard/ProjectsList.tsx', code);
