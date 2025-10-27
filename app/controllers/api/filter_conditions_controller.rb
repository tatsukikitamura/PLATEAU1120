class Api::FilterConditionsController < ApplicationController
  include ApiResponseHelper

  before_action :set_filter_condition, only: [ :update, :destroy, :toggle ]

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
      render_success(@filter_condition.as_json, message: "フィルタ条件が作成されました", status: :created)
    else
      render_error("フィルタ条件の作成に失敗しました", status: :unprocessable_entity, errors: @filter_condition.errors.full_messages)
    end
  end

  # PATCH/PUT /api/filter_conditions/:id
  def update
    return render_not_found("フィルタ条件が見つかりません") if @filter_condition.nil?

    if @filter_condition.update(filter_condition_params)
      render_success(@filter_condition.as_json, message: "フィルタ条件が更新されました")
    else
      render_error("フィルタ条件の更新に失敗しました", status: :unprocessable_entity, errors: @filter_condition.errors.full_messages)
    end
  end

  # DELETE /api/filter_conditions/:id
  def destroy
    return render_not_found("フィルタ条件が見つかりません") if @filter_condition.nil?

    if @filter_condition.destroy
      render_success(@filter_condition.as_json, message: "フィルタ条件が削除されました")
    else
      render_error("フィルタ条件の削除に失敗しました", status: :unprocessable_entity, errors: @filter_condition.errors.full_messages)
    end
  end

  # POST /api/filter_conditions/:id/toggle
  def toggle
    return render_not_found("フィルタ条件が見つかりません") unless @filter_condition

    @filter_condition.update(active: !@filter_condition.active)
    message = @filter_condition.active? ? "フィルタ条件が有効になりました" : "フィルタ条件が無効になりました"
    render_success(@filter_condition.as_json, message: message)
  end

  # POST /api/filter_conditions/reset_defaults
  def reset_defaults
    # 既存のデフォルトフィルタを削除
    FilterCondition.where(name: [
      "ランドマークのみ", "公園のみ", "避難所のみ", "駅のみ"
    ]).destroy_all

    # 新しいデフォルトフィルタを作成
    created_filters = FilterCondition.create_default_filters

    render_success(created_filters.map(&:as_json), message: "#{created_filters.count}件のデフォルトフィルタが作成されました")
  rescue => e
    render_error("デフォルトフィルタのリセットに失敗しました: #{e.message}", status: :internal_server_error)
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
