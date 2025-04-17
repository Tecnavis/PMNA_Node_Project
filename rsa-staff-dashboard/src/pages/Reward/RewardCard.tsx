// /components/reward/RewardCard.tsx
import { Card, Text, Badge, Button, Group } from '@mantine/core';
import { IReward } from '../../interface/reward';
import { BASE_URL } from '../../config/axiosConfig';

interface Props {
    reward: IReward;
    userPoints: number;
    onSelect: (reward: IReward) => void;
}

const RewardCard: React.FC<Props> = ({ reward, userPoints, onSelect }) => {
    const outOfStock = reward.stock <= 0;
    const notEnoughPoints = (userPoints / 2) < reward.pointsRequired;
    const canRedeem = !outOfStock && !notEnoughPoints;

    return (
        <Card shadow="md" radius="lg" p="lg" className="hover:shadow-xl hover:scale-[1.02]" onClick={() => canRedeem && onSelect(reward)} withBorder>
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
                <button
                className='btn btn-primary w-full'
                    // fullWidth
                    // mt="md"
                    // radius="md"
                    // variant={canRedeem ? 'filled' : 'outline'}
                    // color={canRedeem ? 'green' : 'gray'}
                    disabled={!canRedeem}
                    
                >
                    {outOfStock
                        ? 'Out of Stock'
                        : notEnoughPoints
                            ? 'Not Enough Points'
                            : 'Redeem'}
                </button>
            </Group>
        </Card>
    );
};

export default RewardCard;
