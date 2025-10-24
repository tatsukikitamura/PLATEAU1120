class Api::FilterConditionsController < ApplicationController
  before_action :set_filter_condition, only: [:update, :destroy]
  
  # GET /api/filter_conditions
  def index
    @filter_conditions = FilterCondition.active.ordered
    
    # データ型でフィルタリング
    if params[:data_type].present?
      @filter_conditions = @filter_conditions.by_data_type(params[:data_type])
    end
    
    render json: {
      data: @filter_conditions.map(&:as_json),
      meta: {
        total: @filter_conditions.count,
        data_types: FilterCondition.distinct.pluck(:data_type).compact
      }
    }
  end
  
  # POST /api/filter_conditions
  def create
    @filter_condition = FilterCondition.new(filter_condition_params)
    
    if @filter_condition.save
      render json: {
        data: @filter_condition.as_json,
        message: 'フィルタ条件が作成されました'
      }, status: :created
    else
      render json: {
        errors: @filter_condition.errors.full_messages,
        message: 'フィルタ条件の作成に失敗しました'
      }, status: :unprocessable_entity
    end
  end
  
  # PATCH/PUT /api/filter_conditions/:id
  def update
    if @filter_condition.update(filter_condition_params)
      render json: {
        data: @filter_condition.as_json,
        message: 'フィルタ条件が更新されました'
      }
    else
      render json: {
        errors: @filter_condition.errors.full_messages,
        message: 'フィルタ条件の更新に失敗しました'
      }, status: :unprocessable_entity
    end
  end
  
  # DELETE /api/filter_conditions/:id
  def destroy
    if @filter_condition.destroy
      render json: {
        message: 'フィルタ条件が削除されました'
      }
    else
      render json: {
        errors: @filter_condition.errors.full_messages,
        message: 'フィルタ条件の削除に失敗しました'
      }, status: :unprocessable_entity
    end
  end
  
  # POST /api/filter_conditions/:id/toggle
  def toggle
    if @filter_condition
      @filter_condition.update(active: !@filter_condition.active)
      render json: {
        data: @filter_condition.as_json,
        message: @filter_condition.active? ? 'フィルタ条件が有効になりました' : 'フィルタ条件が無効になりました'
      }
    else
      render json: { error: 'フィルタ条件が見つかりません' }, status: :not_found
    end
  end
  
  # POST /api/filter_conditions/reset_defaults
  def reset_defaults
    begin
      # 既存のデフォルトフィルタを削除
      FilterCondition.where(name: [
        'ランドマークのみ', '公園のみ', '避難所のみ', '駅のみ'
      ]).destroy_all
      
      # 新しいデフォルトフィルタを作成
      created_filters = FilterCondition.create_default_filters
      
      render json: {
        data: created_filters.map(&:as_json),
        message: "#{created_filters.count}件のデフォルトフィルタが作成されました"
      }
    rescue => e
      render json: {
        error: e.message,
        message: 'デフォルトフィルタのリセットに失敗しました'
      }, status: :internal_server_error
    end
  end
  
  private
  
  def set_filter_condition
    @filter_condition = FilterCondition.find(params[:id])
  rescue ActiveRecord::RecordNotFound
    @filter_condition = nil
  end
  
  def filter_condition_params
    params.require(:filter_condition).permit(:name, :data_type, :active, :priority, conditions: {})
  end
end
