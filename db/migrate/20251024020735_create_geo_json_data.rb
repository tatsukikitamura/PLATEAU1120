class CreateGeoJsonData < ActiveRecord::Migration[8.0]
  def change
    create_table :geo_json_data do |t|
      t.string :name, null: false
      t.string :data_type, null: false
      t.string :file_path, null: false
      t.boolean :visible, default: true
      t.text :properties_json
      t.text :metadata
      t.integer :display_order, default: 0

      t.timestamps
    end
    
    add_index :geo_json_data, :data_type
    add_index :geo_json_data, :visible
    add_index :geo_json_data, [:data_type, :visible]
  end
end
