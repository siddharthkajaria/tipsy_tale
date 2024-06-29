# This file should contain all the record creation needed to seed the database with its default values.
# The data can then be loaded with the bin/rails db:seed command (or created alongside the database with db:setup).
#
# Examples:
#
#   movies = Movie.create([{ name: "Star Wars" }, { name: "Lord of the Rings" }])
#   Character.create(name: "Luke", movie: movies.first)

Admin.create(email: 'admin@gmail.com', name: 'Admin', password: '12345678', password_confirmation: "12345678")

game_names = ["Drink If","Taboo"]
game_names.each do |g|
    Game.create!(
        name:g, 
        name:g.parameterize.underscore
    )
end

games = Game.all
games.each do |g|
    g.game_instructions.create!(
        game_desc:g.name + "_instructions",
        status:true
    )
    g.game_feedbacks.create!(
        feedback:g.name + "_feedback",
    )
end