FactoryBot.define do
  factory :game_answer do
    game { nil }
    card_code { 1 }
    answer_type { "MyString" }
    text_answer { "MyText" }
    img_answer { "MyText" }
  end
end
