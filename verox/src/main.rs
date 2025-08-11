mod cli;
mod wallet;
mod crypto;
mod biometric;
mod types;
mod utils;

fn main() {
    let cli = cli::Cli::new();
    cli.run();
}
