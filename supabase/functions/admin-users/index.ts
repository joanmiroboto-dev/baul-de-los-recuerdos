import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create admin client with service role key
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    
    // Create client with user's JWT to verify they are admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      console.error('No authorization header provided');
      return new Response(
        JSON.stringify({ error: 'No autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });

    // Get the current user
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) {
      console.error('Error getting user:', userError);
      return new Response(
        JSON.stringify({ error: 'Usuario no autenticado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify user is admin using service role to avoid RLS
    const { data: roleData, error: roleError } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id)
      .single();

    if (roleError || !['admin', 'superadmin'].includes(roleData?.role)) {
      console.error('User is not admin:', user.id, roleData);
      return new Response(
        JSON.stringify({ error: 'Solo administradores pueden realizar esta acción' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const { action } = body;

    console.log('Admin action requested:', action, 'by user:', user.id);

    switch (action) {
      case 'list': {
        // Get all users from auth.users via admin API
        const { data: authUsers, error: listError } = await supabaseAdmin.auth.admin.listUsers();
        if (listError) {
          console.error('Error listing users:', listError);
          throw listError;
        }

        // Get all roles
        const { data: roles, error: rolesError } = await supabaseAdmin
          .from('user_roles')
          .select('user_id, role');
        if (rolesError) {
          console.error('Error fetching roles:', rolesError);
          throw rolesError;
        }

        // Get all profiles
        const { data: profiles, error: profilesError } = await supabaseAdmin
          .from('profiles')
          .select('user_id, display_name, avatar_url');
        if (profilesError) {
          console.error('Error fetching profiles:', profilesError);
          throw profilesError;
        }

        // Combine data
        const users = authUsers.users.map(authUser => {
          const roleRecord = roles?.find(r => r.user_id === authUser.id);
          const profile = profiles?.find(p => p.user_id === authUser.id);
          return {
            id: authUser.id,
            email: authUser.email,
            displayName: profile?.display_name || authUser.email?.split('@')[0],
            avatarUrl: profile?.avatar_url,
            role: roleRecord?.role || null,
            createdAt: authUser.created_at,
          };
        });

        console.log('Listed', users.length, 'users');
        return new Response(
          JSON.stringify({ users }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'create': {
        const { email, password, role, displayName } = body;

        if (!email || !password || !role || !displayName) {
          return new Response(
            JSON.stringify({ error: 'Faltan campos requeridos' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        if (password.length < 8) {
          return new Response(
            JSON.stringify({ error: 'La contraseña debe tener al menos 8 caracteres' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Create user
        const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true, // Auto-confirm email
          user_metadata: { display_name: displayName }
        });

        if (createError) {
          console.error('Error creating user:', createError);
          return new Response(
            JSON.stringify({ error: createError.message }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Assign role
        const { error: roleInsertError } = await supabaseAdmin
          .from('user_roles')
          .insert({ user_id: newUser.user.id, role });

        if (roleInsertError) {
          console.error('Error assigning role:', roleInsertError);
          // Try to delete the user if role assignment fails
          await supabaseAdmin.auth.admin.deleteUser(newUser.user.id);
          throw roleInsertError;
        }

        // Update profile display name (trigger should have created the profile)
        const { error: profileError } = await supabaseAdmin
          .from('profiles')
          .update({ display_name: displayName })
          .eq('user_id', newUser.user.id);

        if (profileError) {
          console.log('Profile update warning:', profileError);
        }

        console.log('Created user:', newUser.user.id, 'with role:', role);
        return new Response(
          JSON.stringify({ 
            success: true, 
            user: { 
              id: newUser.user.id, 
              email, 
              displayName, 
              role 
            } 
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'update-role': {
        const { userId, role } = body;

        if (!userId || !role) {
          return new Response(
            JSON.stringify({ error: 'Faltan campos requeridos' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Prevent admin from changing their own role
        if (userId === user.id) {
          return new Response(
            JSON.stringify({ error: 'No puedes cambiar tu propio rol' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Check if role exists
        const { data: existingRole } = await supabaseAdmin
          .from('user_roles')
          .select('id')
          .eq('user_id', userId)
          .single();

        if (existingRole) {
          // Update existing role
          const { error: updateError } = await supabaseAdmin
            .from('user_roles')
            .update({ role })
            .eq('user_id', userId);

          if (updateError) {
            console.error('Error updating role:', updateError);
            throw updateError;
          }
        } else {
          // Insert new role
          const { error: insertError } = await supabaseAdmin
            .from('user_roles')
            .insert({ user_id: userId, role });

          if (insertError) {
            console.error('Error inserting role:', insertError);
            throw insertError;
          }
        }

        console.log('Updated role for user:', userId, 'to:', role);
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      case 'delete': {
        const { userId } = body;

        if (!userId) {
          return new Response(
            JSON.stringify({ error: 'userId es requerido' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Prevent admin from deleting themselves
        if (userId === user.id) {
          return new Response(
            JSON.stringify({ error: 'No puedes eliminarte a ti mismo' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Delete user (cascade will handle roles and profile)
        const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

        if (deleteError) {
          console.error('Error deleting user:', deleteError);
          throw deleteError;
        }

        console.log('Deleted user:', userId);
        return new Response(
          JSON.stringify({ success: true }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      default:
        return new Response(
          JSON.stringify({ error: 'Acción no válida' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
  } catch (error) {
    console.error('Error in admin-users function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Error interno del servidor';
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
