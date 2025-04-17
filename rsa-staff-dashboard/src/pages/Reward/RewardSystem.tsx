// /components/reward/RewardSystem.tsx
import React, { useState, useEffect } from 'react';
import { Tabs, Modal, Group, Badge, Text, Space, Divider, LoadingOverlay } from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import Swal from 'sweetalert2';
import { getShowroomStaffProfile } from '../../service/showroom';
import { getRewards, getRedeems, redeemReward } from '../../service/reward';
import { IReward, IRedemption } from '../../interface/reward';
import { IShowroomStaff } from '../../interface/staff';
import { BASE_URL } from '../../config/axiosConfig';
import RewardList from './RewardList';
import RedemptionHistory from './RedemptionHistory';
import { MdOutlineRedeem } from 'react-icons/md';
import IconClock from '../../components/Icon/IconClock';

const RewardSystem: React.FC = () => {
    const [rewards, setRewards] = useState<IReward[]>([]);
    const [visibleRewards, setVisibleRewards] = useState<IReward[]>([]);
    const [redemptions, setRedemptions] = useState<IRedemption[]>([]);
    const [staff, setStaff] = useState<IShowroomStaff>();
    const [loading, setLoading] = useState({ rewards: true, redemptions: true });
    const [activeTab, setActiveTab] = useState<string | null>('rewards');
    const [selectedReward, setSelectedReward] = useState<IReward | null>(null);
    const [opened, { open, close }] = useDisclosure(false);
    const [confirmLoading, setConfirmLoading] = useState(false);
    const [page, setPage] = useState(1);
    const pageSize = 8;

    useEffect(() => {
        setVisibleRewards(rewards.slice(0, page * pageSize));
    }, [page, rewards]);

    const handleLoadMore = () => setPage((p) => p + 1);

    const fetchData = async () => {
        try {
            const rewardsRes = await getRewards("ShowroomStaff");
            setRewards(rewardsRes);
        } catch (err) {
            Swal.fire({ icon: 'error', title: 'Error', text: 'Failed to load reward data' });
        } finally {
            setLoading((prev) => ({ ...prev, rewards: false }));
        }
    };

    const fetchRedeems = async () => {
        if (!staff?._id) return;
        try {
            const res = await getRedeems(staff._id, "ShowroomStaff");
            setRedemptions(res.data);
        } catch (err) {
            console.error('Redeem fetch error:', err);
        } finally {
            setLoading((prev) => ({ ...prev, redemptions: false }));
        }
    };

    const init = async () => {
        try {
            const res = await getShowroomStaffProfile();
            const staffData = res.data;
            setStaff(staffData);
            await fetchData();
        } catch (error) {
            console.error("Profile load failed", error);
        }
    };
    useEffect(() => {
        init();
    }, []);

    useEffect(() => {
        if (activeTab === 'history' && redemptions.length === 0) {
            fetchRedeems();
        }
    }, [activeTab]);

    useEffect(() => {
        if (selectedReward) open();
    }, [selectedReward]);

    const handleRedeem = async () => {
        if (!selectedReward || !staff) return;
        setConfirmLoading(true);
        try {
            await redeemReward(selectedReward._id, staff._id, 'ShowroomStaff');
            Swal.fire({ icon: 'success', title: 'Success', text: 'Reward redeemed successfully' });
            fetchRedeems();
            close();
            setSelectedReward(null);
            init()
        } catch (err:any) {
            Swal.fire({ icon: 'error', title: 'Error', text: err.message || 'Redemption failed' });
        } finally {
            setConfirmLoading(false);
        }
    };

    return (
        <div className='panel'>
            <div className='flex items-center justify-between mb-5'>
                <h1 className='text-xl font-semibold'>Rewards</h1>
                <button className='btn btn-primary'>Current Points: {staff?.rewardPoints}</button>
            </div>

            <Tabs value={activeTab} onTabChange={setActiveTab}>
                <Tabs.List>
                    <Tabs.Tab value="rewards" icon={<MdOutlineRedeem className="text-yellow-500 size-5" />}>Available Rewards</Tabs.Tab>
                    <Tabs.Tab value="history" icon={<IconClock className="text-blue-900 size-5" />}>Redemption History</Tabs.Tab>
                </Tabs.List>

                <Tabs.Panel value="rewards" pt="md">
                    <RewardList
                        rewards={visibleRewards}
                        userPoints={staff?.rewardPoints || 0}
                        loading={loading.rewards}
                        onSelectReward={setSelectedReward}
                        onLoadMore={handleLoadMore}
                    />
                </Tabs.Panel>

                <Tabs.Panel value="history" pt="md">
                    <RedemptionHistory
                        redemptions={redemptions}
                        loading={loading.redemptions}
                    />
                </Tabs.Panel>
            </Tabs>

            <Modal opened={opened} onClose={() => { close(); setSelectedReward(null); }} title="Confirm Redemption" size="md" centered>
                <LoadingOverlay visible={confirmLoading} overlayBlur={2} />
                {selectedReward && (
                    <div>
                        <Group mb="md">
                            <img src={`${BASE_URL}images/${selectedReward.image}`} className="rounded-md max-h-64 w-full object-contain" />
                            <div>
                                <span className='text-lg text-gray-800 font-semibold'>{selectedReward.name}</span>
                                <Text size="sm" color="dimmed">{selectedReward.description}</Text>
                            </div>
                        </Group>
                        <Divider my="sm" />
                        <Space h="md" />
                        <Group position="apart">
                            <Badge color="yellow" variant="dot">Required: {selectedReward.pointsRequired}</Badge>
                            <Badge color="blue" variant="dot">You: {staff?.rewardPoints}</Badge>
                        </Group>
                        <Space h="xl" />
                        <Group position="right" mt="md">
                            <button onClick={handleRedeem} className="btn btn-primary">Confirm Redemption</button>
                        </Group>
                    </div>
                )}
            </Modal>
        </div>
    );
};

export default RewardSystem;
