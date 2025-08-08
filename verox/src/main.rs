use crate::cli::Cli;

mod cli;
mod wallet;
mod crypto;
mod biometric;
mod utils;
mod types;

fn main() {
    println!("Welcome to Verox!");
        let cli = Cli::new();
        cli.run();
}
