// /components/reward/RedemptionHistory.tsx
// @ts-ignore
import { Card, Text, Grid, Group, Badge, LoadingOverlay } from '@mantine/core';
import { IRedemption, IReward } from '../../interface/reward';
import { BASE_URL } from '../../config/axiosConfig';

interface Props {
    redemptions: IRedemption[];
    loading: boolean;
}

const RedemptionHistory: React.FC<Props> = ({ redemptions, loading }) => {
    if (loading) return <LoadingOverlay visible overlayBlur={2} />;
    if (redemptions.length === 0) return <Text align="center" color="dimmed">No rewards claimed yet.</Text>;

    return (
        <Grid gutter="lg">
            {redemptions.map((redemption) => {
                const reward = redemption.reward as IReward;
                return (
                    <Grid.Col key={redemption._id} xs={12} sm={6} md={4} lg={3}>
                        <Card shadow="md" radius="lg" p="lg" withBorder>
                            <Card.Section style={{
                                height: 160,
                                background: `url(${BASE_URL}images/${reward.image}) center/cover no-repeat`
                            }} />
                            <Group position="apart" mt="md">
                                <Text weight={600}>{reward.name}</Text>
                            </Group>
                            <Text size="sm" color="dimmed" lineClamp={2}>{reward.description}</Text>
                            <Group position="apart" mt="md">
                                <Badge color="yellow" variant="dot">{reward.pointsRequired} pts</Badge>
                                <Badge color="blue" variant="dot">{new Intl.NumberFormat('en-IN', {
                                    style: 'currency',
                                    currency: 'INR',
                                }).format(reward.price)}</Badge>
                            </Group>
                        </Card>
                    </Grid.Col>
                );
            })}
        </Grid>
    );
};

export default RedemptionHistory;
