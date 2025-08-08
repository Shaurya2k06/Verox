use clap::Command;
use crate::wallet::unlock_wallet;


pub struct Cli;

impl Cli {
    pub fn new() -> Self {
        Cli
    }

    pub fn run(&self) {
        let matches = Command::new("Verox")
            .version("0.1.0")
            .author("Shaurya Srivastava")
            .about("Biometric Wallet Locker")
            .subcommand(Command::new("init").about("Initialize a new wallet"))
            .subcommand(Command::new("unlock").about("Unlock the Wallet"))
            .get_matches();

        match matches.subcommand_name() {
            Some("init") => {
                crate::wallet::init_wallet();
            }
            Some("unlock") => {
                crate::wallet::unlock_wallet();
            }
            _ => {
                println!("Type --help for a list of available commands");
            }
        }
    }
}
