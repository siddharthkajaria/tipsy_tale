
class Admin::GameFeedbacksController < Admin::BaseController
  before_action :set_admin
  before_action :set_game_feedback, only: %i[update]

  def index
    
    @search = GameFeedback.all.ransack(params[:q])
    @game_feedbacks = GameFeedback.all
    respond_to do |format|
      format.html { @pagy, @game_feedbacks = pagy(@search.result) }
      format.csv  { render csv: @search.result }
    end
  end

  def show
    
  end

  def new
    @game_feedback = GameFeedback.new
  end

  def edit; end

  
  def create
    @game_feedback = GameFeedback.new(game_feedback_params)
    if @game_feedback.save
      redirect_to admin_game_feedbacks_path, notice: 'Feedback was successfully created.'
    else
      render :new, status: :unprocessable_entity
    end
  end

  def update
    
    if @game_feedback.update_status(params[:status])
      redirect_to edit_admin_game_feedback_path, notice: 'Feedback was successfully updated.'
    else
      render :edit, status: :unprocessable_entity
    end
  end

  def destroy
    @game_feedback.destroy
    redirect_to admin_game_feedbacks_url, status: :see_other, notice: 'Feedback was successfully destroyed.'
  end

  private

  def set_admin
    @admin = current_admin
  end

  def set_game_feedback
    @game_feedback = GameFeedback.find(params[:id])
  end

  def game_feedback_params
    params.require(:game_feedback).permit(:state)
  end
end
