const fs = require('fs');
let code = fs.readFileSync('src/app/actions/users.ts', 'utf8');

const oldAddAdmin = `    const { data: project } = await supabase.from('projects').select('owner_id').eq('id', projectId).single();
    if (!project || project.owner_id !== user.id) return { error: 'Only the project owner can add co-owners.' };`;

const newAddAdmin = `    const { data: project } = await supabase.from('projects').select('owner_id').eq('id', projectId).single();
    if (!project) return { error: 'Project not found.' };
    
    if (project.owner_id !== user.id) {
      const adminAuthClient = createAdminClient();
      const { data: adminCheck } = await adminAuthClient.from('project_admins').select('id').eq('project_id', projectId).eq('user_id', user.id).maybeSingle();
      if (!adminCheck) return { error: 'Only the project owner or co-owners can add co-owners.' };
    }`;

code = code.replace(oldAddAdmin, newAddAdmin);

const oldRemoveAdmin = `    const { data: project } = await supabase.from('projects').select('owner_id').eq('id', projectId).single();
    if (!project || project.owner_id !== user.id) return { error: 'Only the project owner can remove co-owners.' };`;

const newRemoveAdmin = `    const { data: project } = await supabase.from('projects').select('owner_id').eq('id', projectId).single();
    if (!project) return { error: 'Project not found.' };
    
    if (project.owner_id !== user.id) {
      const adminAuthClient = createAdminClient();
      const { data: adminCheck } = await adminAuthClient.from('project_admins').select('id').eq('project_id', projectId).eq('user_id', user.id).maybeSingle();
      if (!adminCheck) return { error: 'Only the project owner or co-owners can remove co-owners.' };
    }`;

code = code.replace(oldRemoveAdmin, newRemoveAdmin);

fs.writeFileSync('src/app/actions/users.ts', code);
