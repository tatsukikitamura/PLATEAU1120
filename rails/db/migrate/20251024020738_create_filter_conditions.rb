class CreateFilterConditions < ActiveRecord::Migration[8.0]
  def change
    create_table :filter_conditions do |t|
      t.string :name, null: false
      t.text :conditions, null: false
      t.integer :user_id
      t.boolean :active, default: true
      t.string :data_type
      t.integer :priority, default: 0

      t.timestamps
    end

    add_index :filter_conditions, :user_id
    add_index :filter_conditions, :active
    add_index :filter_conditions, :data_type
    add_index :filter_conditions, [ :user_id, :active ]
  end
end
