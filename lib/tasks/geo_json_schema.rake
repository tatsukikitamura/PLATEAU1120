namespace :geo_json do
  desc "Extract and save schema summaries for all GeoJSON data"
  task extract_schemas: :environment do
    puts "Starting schema extraction for GeoJSON data..."
    
    count = 0
    error_count = 0
    
    GeoJsonData.find_each do |record|
      begin
        schema_summary = record.extract_schema_summary
        
        if schema_summary.present?
          record.schema_summary_hash = schema_summary
          if record.save
            puts "✓ Extracted schema for: #{record.name} (#{record.data_type})"
            count += 1
          else
            puts "✗ Failed to save schema for: #{record.name} - #{record.errors.full_messages.join(', ')}"
            error_count += 1
          end
        else
          puts "⊘ No schema found for: #{record.name} (#{record.data_type})"
          error_count += 1
        end
      rescue => e
        puts "✗ Error extracting schema for: #{record.name} - #{e.message}"
        error_count += 1
      end
    end
    
    puts "\nSchema extraction completed:"
    puts "  Success: #{count}"
    puts "  Errors:  #{error_count}"
  end
end

