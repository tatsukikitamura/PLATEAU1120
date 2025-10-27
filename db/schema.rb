# This file is auto-generated from the current state of the database. Instead
# of editing this file, please use the migrations feature of Active Record to
# incrementally modify your database, and then regenerate this schema definition.
#
# This file is the source Rails uses to define your schema when running `bin/rails
# db:schema:load`. When creating a new database, `bin/rails db:schema:load` tends to
# be faster and is potentially less error prone than running all of your
# migrations from scratch. Old migrations may fail to apply correctly if those
# migrations use external dependencies or application code.
#
# It's strongly recommended that you check this file into your version control system.

ActiveRecord::Schema[8.0].define(version: 2025_10_27_025010) do
  create_table "filter_conditions", force: :cascade do |t|
    t.string "name", null: false
    t.text "conditions", null: false
    t.integer "user_id"
    t.boolean "active", default: true
    t.string "data_type"
    t.integer "priority", default: 0
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.index ["active"], name: "index_filter_conditions_on_active"
    t.index ["data_type"], name: "index_filter_conditions_on_data_type"
    t.index ["user_id", "active"], name: "index_filter_conditions_on_user_id_and_active"
    t.index ["user_id"], name: "index_filter_conditions_on_user_id"
  end

  create_table "geo_json_data", force: :cascade do |t|
    t.string "name", null: false
    t.string "data_type", null: false
    t.string "file_path", null: false
    t.boolean "visible", default: true
    t.text "properties_json"
    t.text "metadata"
    t.integer "display_order", default: 0
    t.datetime "created_at", null: false
    t.datetime "updated_at", null: false
    t.text "schema_summary"
    t.index ["data_type", "visible"], name: "index_geo_json_data_on_data_type_and_visible"
    t.index ["data_type"], name: "index_geo_json_data_on_data_type"
    t.index ["visible"], name: "index_geo_json_data_on_visible"
  end
end
