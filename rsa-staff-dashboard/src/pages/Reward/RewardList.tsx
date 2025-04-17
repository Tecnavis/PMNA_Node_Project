// /components/reward/RewardList.tsx
import { Grid, Text } from '@mantine/core';
import { IReward } from '../../interface/reward';
import RewardCard from './RewardCard';

interface Props {
    rewards: IReward[];
    userPoints: number;
    loading: boolean;
    onSelectReward: (reward: IReward) => void;
    onLoadMore: () => void;
}

const RewardList: React.FC<Props> = ({ rewards, userPoints, loading, onSelectReward }) => {
    if (loading) return <span>Loading...</span>;
    if (rewards.length === 0) return <Text align="center" color="dimmed">No rewards available.</Text>;

    return (
        <Grid gutter="lg">
            {rewards.map((reward) => (
                <Grid.Col key={reward._id} xs={12} sm={6} md={4} lg={3}>
                    <RewardCard reward={reward} userPoints={userPoints} onSelect={onSelectReward} />
                </Grid.Col>
            ))}
        </Grid>
    );
};

export default RewardList;
