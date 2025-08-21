import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('user_interactions')
@Index(['userId', 'eventType'])
export class UserInteraction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  userId: string;

  @Column()
  eventType: string;

  @Column('jsonb')
  eventData: any;

  @Column()
  sessionId: string;

  @CreateDateColumn()
  timestamp: Date;

  @Column({ default: false })
  processed: boolean;
}
