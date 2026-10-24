"""Create user accounts and vehicle inventory."""
from alembic import op
import sqlalchemy as sa

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade():
    op.create_table("users",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("email", sa.String(254), nullable=False),
        sa.Column("password_hash", sa.String(255), nullable=False),
        sa.Column("role", sa.String(20), nullable=False),
        sa.CheckConstraint("role IN ('customer', 'admin')", name="valid_role"),
    )
    op.create_index("ix_users_email", "users", ["email"], unique=True)
    op.create_table("vehicles",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("make", sa.String(80), nullable=False),
        sa.Column("model", sa.String(100), nullable=False),
        sa.Column("category", sa.String(50), nullable=False),
        sa.Column("price_cents", sa.Integer(), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.CheckConstraint("quantity >= 0 AND quantity <= 1000000", name="valid_quantity"),
        sa.CheckConstraint("price_cents >= 0 AND price_cents <= 99999999999", name="valid_price"),
    )
    for field in ("make", "model", "category"):
        op.create_index(f"ix_vehicles_{field}", "vehicles", [field])


def downgrade():
    op.drop_table("vehicles")
    op.drop_table("users")
