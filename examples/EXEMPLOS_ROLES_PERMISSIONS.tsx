/* eslint-disable @typescript-eslint/no-explicit-any, react-refresh/only-export-components */
// EXEMPLOS DE USO: Roles & Permissions Matrix
// Data: 23 de Março de 2026

/**
 * ============================================================================
 * EXEMPLOS DE INTEGRAÇÃO NO CÓDIGO FRONTEND/BACKEND
 * ============================================================================
 */

// ============================================================================
// 1. VERIFICAÇÃO DE PERMISSÕES NO TYPESCRIPT/BACKEND
// ============================================================================

import { createClient } from '@supabase/supabase-js'

const supabase = createClient(url, key)

/**
 * Verificar se usuário pode executar ação
 */
async function canUserPerformAction(
  userId: string,
  feature: string,
  action: string
): Promise<boolean> {
  const { data, error } = await supabase
    .rpc('has_permission', {
      _user_id: userId,
      _feature: feature,
      _action: action
    })

  if (error) throw error
  return !!data
}

/**
 * Exemplo de uso:
 */
async function createPost(userId: string, postData: any) {
  const canCreate = await canUserPerformAction(userId, 'posts', 'create')
  
  if (!canCreate) {
    throw new Error('User does not have permission to create posts')
  }

  // Proceed com criação
  const { data, error } = await supabase
    .from('posts')
    .insert([postData])
    .select()

  return data?.[0]
}

/**
 * ============================================================================
 * 2. OBTER TODAS AS PERMISSÕES DO USUÁRIO
 * ============================================================================
 */

async function getUserPermissions(userId: string) {
  const { data, error } = await supabase
    .rpc('get_effective_permissions', {
      _user_id: userId
    })

  if (error) throw error
  
  return data // {role_permissions: {...}, overrides: {...}}
}

/**
 * Exemplo: Carregar permissões no context/store
 */
export function useUserPermissions(userId: string) {
  const [permissions, setPermissions] = React.useState(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    getUserPermissions(userId)
      .then(setPermissions)
      .finally(() => setLoading(false))
  }, [userId])

  return { permissions, loading }
}

/**
 * ============================================================================
 * 3. ATRIBUIR E REVOGAR ROLES
 * ============================================================================
 */

// Atribuir role com auditoria
async function promoteUserToEditor(
  userId: string,
  reason: string = ''
) {
  const { data, error } = await supabase
    .rpc('assign_role_with_audit', {
      _user_id: userId,
      _role: 'editor', // app_role enum
      _reason: reason
    })

  if (error) throw error
  return data
}

// Revogar role com auditoria
async function revokeModeratorRole(
  userId: string,
  reason: string = ''
) {
  const { data, error } = await supabase
    .rpc('revoke_role_with_audit', {
      _user_id: userId,
      _role: 'moderador',
      _reason: reason
    })

  if (error) throw error
  return data
}

// Exemplo:
async function handleUserPromotion(userId: string) {
  try {
    await promoteUserToEditor(
      userId,
      'Excellent performance in Q1 2026'
    )
    
    // Notify user
    toast.success('User promoted to Editor')
  } catch (error) {
    toast.error('Failed to promote user')
  }
}

/**
 * ============================================================================
 * 4. VERIFICAÇÕES AVANÇADAS
 * ============================================================================
 */

// Verifica se usuário tem QUALQUER um dos roles
async function hasAnyRole(
  userId: string,
  roles: string[]
) {
  const { data, error } = await supabase
    .rpc('has_any_role', {
      _user_id: userId,
      _roles: roles
    })

  if (error) throw error
  return !!data
}

// Verifica se usuário tem TODOS os roles
async function hasAllRoles(
  userId: string,
  roles: string[]
) {
  const { data, error } = await supabase
    .rpc('has_all_roles', {
      _user_id: userId,
      _roles: roles
    })

  if (error) throw error
  return !!data
}

// Exemplo: Renderizar UI baseado em múltiplos roles
const EditorialPanel = ({ userId }: { userId: string }) => {
  const [isEditor, setIsEditor] = React.useState(false)

  React.useEffect(() => {
    hasAnyRole(userId, ['admin', 'editor']).then(setIsEditor)
  }, [userId])

  return isEditor ? <EditorActions /> : null
}

/**
 * ============================================================================
 * 5. ATRIBUIÇÕES EM BULK
 * ============================================================================
 */

// Atribuir múltiplos roles a múltiplos usuários
async function assignRolesToUsers(
  userIds: string[],
  roles: string[],
  reason: string
) {
  const { data, error } = await supabase
    .rpc('assign_roles_to_users', {
      _user_ids: userIds,
      _roles: roles,
      _reason: reason
    })

  if (error) throw error
  
  return data
  // {
  //   success: boolean,
  //   assigned_count: number,
  //   failed_count: number,
  //   details: {...}
  // }
}

// Exemplo: Promover equipe inteira
async function setupEditorialTeam(teamMemberIds: string[]) {
  const result = await assignRolesToUsers(
    teamMemberIds,
    ['editor'],
    'Initial editorial team setup Q1 2026'
  )

  if (result.success) {
    toast.success(`Assigned roles to ${result.assigned_count} users`)
  } else {
    toast.error(`Failed to assign ${result.failed_count} users`)
  }
}

/**
 * ============================================================================
 * 6. PERMISSÕES TEMPORÁRIAS (OVERRIDES)
 * ============================================================================
 */

// Conceder permissão temporária
async function grantTemporaryPermission(
  userId: string,
  feature: string,
  action: string,
  expiresIn: number // hours
) {
  const expiresAt = new Date()
  expiresAt.setHours(expiresAt.getHours() + expiresIn)

  const { data, error } = await supabase
    .from('permission_overrides')
    .insert([{
      user_id: userId,
      feature,
      action,
      granted: true,
      expires_at: expiresAt.toISOString(),
      reason: `Temporary access granted for 24 hours`
    }])

  if (error) throw error
  return data?.[0]
}

// Exemplo: Acesso temporário a analytics
async function grantTemporaryAnalyticsAccess(userId: string) {
  await grantTemporaryPermission(
    userId,
    'analytics',
    'read',
    24 // 24 hours
  )

  toast.success('User can access analytics for 24 hours')
}

// Revogar permissão temporária
async function revokeTemporaryPermission(
  userId: string,
  feature: string,
  action: string
) {
  const { error } = await supabase
    .from('permission_overrides')
    .delete()
    .eq('user_id', userId)
    .eq('feature', feature)
    .eq('action', action)

  if (error) throw error
}

/**
 * ============================================================================
 * 7. AUDITORIA E MONITORAMENTO
 * ============================================================================
 */

// Obter histórico de mudanças de roles de um usuário
async function getUserRoleHistory(userId: string) {
  const { data, error } = await supabase
    .from('role_assignment_history')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

// Exemplo: Componente de auditoria
const UserAuditLog = ({ userId }: { userId: string }) => {
  const [history, setHistory] = React.useState([])

  React.useEffect(() => {
    getUserRoleHistory(userId).then(setHistory)
  }, [userId])

  return (
    <div className="space-y-2">
      {history.map(entry => (
        <div key={entry.id} className="text-sm border-b pb-2">
          <p className="font-medium">
            {entry.action} {entry.role}
          </p>
          <p className="text-gray-500">{entry.change_reason}</p>
          <p className="text-xs text-gray-400">
            By {entry.changed_by} at {new Date(entry.created_at).toLocaleString()}
          </p>
        </div>
      ))}
    </div>
  )
}

// Obter relatório de consistência de roles
async function getRoleConsistencyReport() {
  const { data, error } = await supabase
    .from('role_consistency_report')
    .select('*')
    .order('assigned_users', { ascending: false })

  if (error) throw error
  return data
}

// Verificar integridade de dados
async function checkPermissionsIntegrity() {
  const { data, error } = await supabase
    .rpc('check_permissions_integrity')

  if (error) throw error
  return data
}

// Exemplo: Dashboard de monitoramento
const PermissionsHealthCheck = () => {
  const [checks, setChecks] = React.useState([])

  React.useEffect(() => {
    checkPermissionsIntegrity().then(setChecks)
  }, [])

  return (
    <div className="space-y-4">
      {checks.map(check => (
        <div
          key={check.check_name}
          className={`p-4 rounded ${
            check.status === 'OK' ? 'bg-green-50' : 'bg-red-50'
          }`}
        >
          <h3 className="font-semibold">{check.check_name}</h3>
          <p className="text-sm">{check.details}</p>
          <span className={`text-xs font-bold ${
            check.status === 'OK' ? 'text-green-600' : 'text-red-600'
          }`}>
            {check.status}
          </span>
        </div>
      ))}
    </div>
  )
}

/**
 * ============================================================================
 * 8. COMPONENTE GENÉRICO DE VERIFICAÇÃO DE PERMISSÃO
 * ============================================================================
 */

interface PermissionGateProps {
  userId: string
  feature: string
  action: string
  children: React.ReactNode
  fallback?: React.ReactNode
}

const PermissionGate: React.FC<PermissionGateProps> = ({
  userId,
  feature,
  action,
  children,
  fallback = null
}) => {
  const [hasPermission, setHasPermission] = React.useState(false)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    canUserPerformAction(userId, feature, action)
      .then(setHasPermission)
      .finally(() => setLoading(false))
  }, [userId, feature, action])

  if (loading) {
    return <div className="animate-pulse">Loading...</div>
  }

  return hasPermission ? <>{children}</> : <>{fallback}</>
}

// Exemplo de uso:
export function PostEditor({ userId, postId }: any) {
  return (
    <PermissionGate
      userId={userId}
      feature="posts"
      action="update"
      fallback={<div className="text-red-500">You cannot edit posts</div>}
    >
      <div className="border-4 border-green-500">
        <h2>Edit Post</h2>
        {/* Form para editar post */}
      </div>
    </PermissionGate>
  )
}

/**
 * ============================================================================
 * 9. HOOK PARA GERENCIAR ROLES DO USUÁRIO
 * ============================================================================
 */

interface UserRole {
  role: string
  assigned_at: string
  expires_at?: string
}

export function useUserRoles(userId: string) {
  const [roles, setRoles] = React.useState<UserRole[]>([])
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    const fetchRoles = async () => {
      const { data, error } = await supabase
        .rpc('get_user_active_roles', {
          _user_id: userId
        })

      if (!error) {
        setRoles(data || [])
      }

      setLoading(false)
    }

    fetchRoles()
  }, [userId])

  return { roles, loading, hasRole: (role: string) => roles.some(r => r.role === role) }
}

/**
 * ============================================================================
 * 10. CONTEXT PARA PERMISSÕES DA APLICAÇÃO
 * ============================================================================
 */

interface PermissionsContextType {
  permissions: any
  hasPermission: (feature: string, action: string) => boolean
  loading: boolean
}

const PermissionsContext = React.createContext<PermissionsContextType | null>(null)

export function PermissionsProvider({ userId, children }: any) {
  const [permissions, setPermissions] = React.useState(null)
  const [loading, setLoading] = React.useState(true)

  React.useEffect(() => {
    getUserPermissions(userId)
      .then(setPermissions)
      .finally(() => setLoading(false))
  }, [userId])

  const hasPermission = (feature: string, action: string) => {
    if (!permissions) return false
    const rolePerms = permissions.role_permissions || {}
    
    for (const role in rolePerms) {
      const features = rolePerms[role]
      if (features && features[feature]?.includes(action)) {
        return true
      }
    }
    
    return false
  }

  return (
    <PermissionsContext.Provider value={{ permissions, hasPermission, loading }}>
      {children}
    </PermissionsContext.Provider>
  )
}

export const usePermissions = () => {
  const context = React.useContext(PermissionsContext)
  if (!context) {
    throw new Error('usePermissions must be used inside PermissionsProvider')
  }
  return context
}

/**
 * ============================================================================
 * PADRÕES DE USO RECOMENDADOS
 * ============================================================================
 */

/*
1. PROTEÇÃO DE ROTAS:

import { useUserContext } from './contexts/UserContext'
import { usePermissions } from './hooks/usePermissions'

function AdminDashboard() {
  const { user } = useUserContext()
  const { hasPermission } = usePermissions()

  if (!hasPermission('dashboard', 'view_admin')) {
    return <AccessDenied />
  }

  return <AdminContent />
}

2. COMPONENTES CONDICIONAIS:

<PermissionGate userId={userId} feature="posts" action="delete">
  <DeleteButton onClick={() => deletePost(postId)} />
</PermissionGate>

3. VERIFICAÇÃO EM EVENTOS:

const handlePublish = async () => {
  const canPublish = await canUserPerformAction(
    userId,
    'posts',
    'publish'
  )

  if (!canPublish) {
    toast.error('You do not have permission to publish posts')
    return
  }

  // Proceed com publicação
}

4. AUDITORIA DE AÇÕES:

const handleAdminAction = async (userId, action, details) => {
  try {
    if (!await canUserPerformAction(currentUserId, 'users', 'delete')) {
      throw new Error('Insufficient permissions')
    }

    // Executar ação
    await executeAction()

    // Log será feito automaticamente via triggers
  } catch (error) {
    console.error('Admin action failed:', error)
  }
}
*/

export {
  canUserPerformAction,
  getUserPermissions,
  promoteUserToEditor,
  revokeModeratorRole,
  hasAnyRole,
  hasAllRoles,
  assignRolesToUsers,
  grantTemporaryPermission,
  revokeTemporaryPermission,
  getUserRoleHistory,
  getRoleConsistencyReport,
  checkPermissionsIntegrity,
  PermissionGate,
  useUserRoles,
  PermissionsProvider,
  usePermissions
}
