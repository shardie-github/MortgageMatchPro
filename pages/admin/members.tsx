import { GetServerSideProps } from 'next'
import { useTenantContext } from '@/lib/tenancy/context'
import AdminLayout from '@/components/admin/AdminLayout'
import MembersManagement from '@/components/admin/MembersManagement'

export default function AdminMembers() {
  return (
    <AdminLayout>
      <MembersManagement />
    </AdminLayout>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  // In a real implementation, you would verify the user's session and permissions here
  return {
    props: {}
  }
}