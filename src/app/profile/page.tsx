"use client";

import { useAccount, useEnsAvatar, useEnsName } from "wagmi";
import { mainnet } from "viem/chains";
import { Card, Avatar, TransactionHistory } from "@/components";
import { useHistoryStore, useAvatarStore } from "@/store";
import { useHydration } from "@/hooks";
import { shortenAddress } from "@/lib/utils";

export default function ProfilePage() {
  const { address, isConnected } = useAccount();
  const hydrated = useHydration();
  const { transactions } = useHistoryStore();
  const { avatar, setAvatar } = useAvatarStore();
  const { data: ensName } = useEnsName({ address, chainId: mainnet.id });
  const { data: ensAvatar } = useEnsAvatar({ name: ensName ?? undefined, chainId: mainnet.id });

  const handleUpload = (d: string) => { setAvatar(address ?? null, d); };

  if (!isConnected || !address) {
    return (
      <Card elevated>
        <div className="text-center py-14">
          <p className="text-[16px] text-txt-1 font-medium mb-1">Connect your wallet</p>
          <p className="text-[13px] text-txt-3">Use the button in the top right</p>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card elevated className="text-center !py-10">
        <div className="flex justify-center mb-5">
          <Avatar address={address} size={96} ensAvatar={ensAvatar} uploadedImage={avatar} onUpload={handleUpload} />
        </div>
        {ensName && <p className="text-[18px] font-semibold mb-0.5">{ensName}</p>}
        <p
          className="text-[14px] font-mono text-txt-1 cursor-pointer hover:text-accent transition-colors inline-block"
          onClick={() => navigator.clipboard.writeText(address)}
          title="Click to copy"
        >
          {shortenAddress(address)}
        </p>
        <p className="text-[11px] text-txt-3 mt-2 uppercase tracking-[0.12em] font-medium">Connected wallet</p>
      </Card>

      <Card title="Transaction history">
        {hydrated
          ? <TransactionHistory transactions={transactions} />
          : <div className="text-center py-8 text-txt-3 text-[13px]">Loading...</div>
        }
      </Card>
    </>
  );
}
