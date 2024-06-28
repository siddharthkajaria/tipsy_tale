Rails.application.routes.draw do
  devise_for :users
  devise_for :admins, controllers: {
    sessions: 'admin/sessions'
  }

  namespace :admin do
    get    '/',        to: 'games#index'
    resources :users
    resources :games, param: :slug
    resources :game_instructions
    resources :game_feedbacks
    resources :game_answers do
    collection do 
      post "upload_excel"
    end 
  end
    
    resources :profile, only: %i[index update] do
      collection do
        get 'password'
        put 'update_password'
      end
    end
  end
  mount Sidekiq::Web => '/sidekiq'

  get 'home/index'
  # Define your application routes per the DSL in https://guides.rubyonrails.org/routing.html

  # Defines the root path route ("/")
  root "home#index"

  get ':slug', to: 'games#show', as: :friendly_game
  get ':slug/feedback', to: 'game_feedbacks#new', as: :friendly_game_feedback
  post ':slug/feedback', to: 'game_feedbacks#create', as: :create_friendly_game_feedback
  get ':slug/rule', to: 'game_instructions#show', as: :friendly_game_instruction
  get ':slug/answer', to: 'game_answers#card_code', as: :friendly_game_answer

end
