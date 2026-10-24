"""Add Indian catalogue metadata and durable customer commerce records."""
from alembic import op
import sqlalchemy as sa

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade():
    # Existing prices were USD: retain their meaning, never relabel as INR.
    op.add_column("vehicles", sa.Column("currency", sa.String(3), nullable=False, server_default="USD"))
    op.add_column("vehicles", sa.Column("seating_capacity", sa.Integer(), nullable=True))
    for name, length, default in [("description", 2000, ""), ("image_url", 2000, ""), ("source_url", 2000, ""), ("price_note", 500, "Legacy USD listing; requires INR repricing")]:
        op.add_column("vehicles", sa.Column(name, sa.String(length), nullable=False, server_default=default))
    op.add_column("vehicles", sa.Column("specifications", sa.JSON(), nullable=False, server_default="{}"))
    op.add_column("vehicles", sa.Column("features", sa.JSON(), nullable=False, server_default="[]"))
    op.create_table("orders",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("reference", sa.String(50), nullable=False),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("vehicle_id", sa.Integer(), sa.ForeignKey("vehicles.id", ondelete="SET NULL"), nullable=True),
        sa.Column("idempotency_key", sa.String(100), nullable=False),
        sa.Column("request_hash", sa.String(64), nullable=False),
        sa.Column("created_at", sa.String(40), nullable=False),
        sa.Column("buyer_name", sa.String(100), nullable=False),
        sa.Column("customer_email", sa.String(254), nullable=False),
        sa.Column("city", sa.String(100), nullable=False),
        sa.Column("summary", sa.JSON(), nullable=False),
        sa.Column("quantity", sa.Integer(), nullable=False),
        sa.Column("payment_status", sa.String(20), nullable=False),
        sa.UniqueConstraint("user_id", "idempotency_key", name="uq_customer_checkout"),
    )
    op.create_index("ix_orders_reference", "orders", ["reference"], unique=True)
    op.create_index("ix_orders_user_id", "orders", ["user_id"])
    op.create_table("wishlist",
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="CASCADE"), primary_key=True),
        sa.Column("vehicle_id", sa.Integer(), sa.ForeignKey("vehicles.id", ondelete="CASCADE"), primary_key=True),
    )
    op.create_table("test_drives",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("vehicle_id", sa.Integer(), sa.ForeignKey("vehicles.id", ondelete="SET NULL"), nullable=True),
        sa.Column("vehicle_name", sa.String(200), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("phone", sa.String(15), nullable=False),
        sa.Column("city", sa.String(100), nullable=False),
        sa.Column("preferred_date", sa.String(10), nullable=False),
        sa.Column("status", sa.String(20), nullable=False),
        sa.Column("created_at", sa.String(40), nullable=False),
    )
    op.create_index("ix_test_drives_user_id", "test_drives", ["user_id"])


def downgrade():
    op.drop_table("test_drives")
    op.drop_table("wishlist")
    op.drop_table("orders")
    with op.batch_alter_table("vehicles") as batch:
        for name in ["currency", "seating_capacity", "description", "image_url", "source_url", "price_note", "specifications", "features"]:
            batch.drop_column(name)
