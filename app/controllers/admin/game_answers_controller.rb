
class Admin::GameAnswersController < Admin::BaseController
  before_action :set_admin
  before_action :set_game, only: %i[upload_excel]
  before_action :set_game_answer, only: %i[show edit update destroy]


  def show
    
  end

  def new
    @game_answer = GameAnswer.new
  end

  def edit; end

  def upload_excel
    file = params[:excel_file]

    if file.present?
      # Process the file here (e.g., using the Roo gem to parse Excel files)
      spreadsheet = Roo::Spreadsheet.open(file.path)
      header = spreadsheet.row(1)

      (2..spreadsheet.last_row).each do |i|
        row = Hash[[header, spreadsheet.row(i)].transpose]
        # Assuming your GameAnswer model has attributes :card_code, :answer_type, :text_answer, :img_answer
        game_answer = @game.game_answers.new(
          card_code: row['card_code'],
          answer_type: row['answer_type'],
          text_answer: row['text_answer'],
          video_link: row['video_link']

        )
        game_answer.save!
      end
      render json: { message: 'File processed successfully' }, status: :ok
    else
      render json: { error: 'No file uploaded' }, status: :unprocessable_entity
    end
  rescue => e
    render json: { error: e.message }, status: :unprocessable_entity
    
  end
  
  def create
    @game_answer = GameAnswer.new(game_answer_params)
    if @game_answer.save
      redirect_to admin_game_answers_path, notice: 'Answer was successfully created.'
    else
      render :new, status: :unprocessable_entity
    end
  end

  def update
    if @game_answer.update(game_answer_params)
      redirect_to edit_admin_game_answer_path, notice: 'Answer was successfully updated.'
    else
      render :edit, status: :unprocessable_entity
    end
  end

  def destroy
    @game_answer.destroy
    redirect_to admin_game_answers_url, status: :see_other, notice: 'Answer was successfully destroyed.'
  end

  private

  def set_admin
    @admin = current_admin
  end

  def set_game_answer
    @game_answer = GameAnswer.find(params[:id])
  end

  def set_game
    @game = Game.find(params[:id])
  end

  def game_answer_params
    params.require(:game_answer).permit(:card_code,:answer_type,:text_answer,:video_link,:img_answer, :image_answer)
  end
end
