class AddSchemaSummaryToGeoJsonData < ActiveRecord::Migration[8.0]
  def change
    add_column :geo_json_data, :schema_summary, :text
  end
end
