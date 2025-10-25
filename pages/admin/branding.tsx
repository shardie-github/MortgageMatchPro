import { GetServerSideProps } from 'next'
import { useTenantContext } from '@/lib/tenancy/context'
import AdminLayout from '@/components/admin/AdminLayout'
import BrandingManagement from '@/components/admin/BrandingManagement'

export default function AdminBranding() {
  return (
    <AdminLayout>
      <BrandingManagement />
    </AdminLayout>
  )
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  // In a real implementation, you would verify the user's session and permissions here
  return {
    props: {}
  }
}