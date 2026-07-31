'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { ContractForm } from '@/components/documents/contract-form';
import { getContract } from '@/lib/firebase/database';
import type { Contract } from '@/lib/db/types';
import { toast } from 'sonner';

export default function EditContractPage() {
  const params = useParams();
  const id = params.id as string;
  const [contract, setContract] = useState<Contract | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const data = await getContract(id);
        setContract(data);
      } catch {
        toast.error('Failed to load contract');
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading contract...</p>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Contract not found</p>
      </div>
    );
  }

  return <ContractForm existingContract={contract} />;
}
