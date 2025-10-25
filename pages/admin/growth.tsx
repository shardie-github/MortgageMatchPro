import React from 'react';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import GrowthDashboard from '../../components/dashboard/growth/GrowthDashboard';

interface GrowthPageProps {
  tenantId?: string;
}

export default function GrowthPage({ tenantId }: GrowthPageProps) {
  return (
    <>
      <Head>
        <title>Growth Dashboard - MortgageMatchPro</title>
        <meta name="description" content="Growth analytics and key performance indicators" />
      </Head>
      <div className="container mx-auto px-4 py-8">
        <GrowthDashboard tenantId={tenantId} />
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const { tenantId } = context.query;
  
  return {
    props: {
      tenantId: tenantId || null
    }
  };
};
