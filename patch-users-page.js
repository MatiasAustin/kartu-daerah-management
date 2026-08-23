const fs = require('fs');
let code = fs.readFileSync('src/app/(dashboard)/dashboard/users/page.tsx', 'utf8');

const oldFetch = `  // Fetch current admins for owned projects
  const { data: adminsData } = ownedProjectIds.length > 0 ? await supabase
    .from("project_admins")
    .select("id, project_id, user_id, projects(name)")
    .in("project_id", ownedProjectIds) : { data: [] };`;

const newFetch = `  // Fetch current admins for owned projects AND co-owned projects
  const { data: adminsData } = allAdminProjects.length > 0 ? await supabase
    .from("project_admins")
    .select("id, project_id, user_id, projects(name)")
    .in("project_id", allAdminProjects.map(p => p.id)) : { data: [] };`;

// Move `allAdminProjects` definition up before adminsData fetch
// It currently is defined below `adminsData`

// I'll just write a targeted replacement
code = code.replace(oldFetch, '/* replaced */');

const adminProjectsCode = `  // Fetch projects where user is a co-owner/admin
  const { data: adminProjectsResult } = await supabase
    .from("project_admins")
    .select("projects(id, name)")
    .eq("user_id", session.user.id);

  const adminProjectsArray = adminProjectsResult?.map((p: any) => p.projects).filter(Boolean) || [];
  
  // Combine unique projects for Admin access
  const allAdminProjects = [...(ownedProjects || []), ...adminProjectsArray];
  const uniqueAdminProjectsMap = new Map(allAdminProjects.map(p => [p.id, p]));
  const adminProjects = Array.from(uniqueAdminProjectsMap.values());
  const adminProjectIds = adminProjects.map(p => p.id);

  // Fetch current admins for ALL admin projects
  const { data: adminsData } = adminProjectIds.length > 0 ? await supabase
    .from("project_admins")
    .select("id, project_id, user_id, projects(name)")
    .in("project_id", adminProjectIds) : { data: [] };`;

code = code.replace(`  // Fetch projects where user is a co-owner/admin
  const { data: adminProjectsResult } = await supabase
    .from("project_admins")
    .select("projects(id, name)")
    .eq("user_id", session.user.id);`, `/* moved */`);

code = code.replace(`  const adminProjectsArray = adminProjectsResult?.map((p: any) => p.projects).filter(Boolean) || [];`, `/* moved */`);
code = code.replace(`  // Combine unique projects for Admin access
  const allAdminProjects = [...(ownedProjects || []), ...adminProjectsArray];
  const uniqueAdminProjectsMap = new Map(allAdminProjects.map(p => [p.id, p]));
  const adminProjects = Array.from(uniqueAdminProjectsMap.values());
  const adminProjectIds = adminProjects.map(p => p.id);`, `/* moved */`);

code = code.replace(`/* replaced */`, adminProjectsCode);

// For PublisherManager, we need to pass adminProjects to it instead of just ownedProjects if it does that
code = code.replace(/<AdminManager\s+projects=\{ownedProjects\s*\|\|\s*\[\]\}\s+admins=\{admins\}\s*\/>/, '<AdminManager projects={adminProjects} admins={admins} />');

fs.writeFileSync('src/app/(dashboard)/dashboard/users/page.tsx', code);
