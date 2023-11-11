const {
  time,
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");
const { expect } = require("chai");

describe("OwnerHeir", function () {
  async function deployOwnerHeir() {
    const ONE_GWEI = 1_000_000_000;

    const initialDeposit = ONE_GWEI;

    const [owner, heir, otherAccount] = await ethers.getSigners();

    const OwnerHeir = await ethers.getContractFactory("OwnerHeir");
    const ownerHeir = await OwnerHeir.deploy(heir, { value: initialDeposit });

    const nextTakeOverTime = await ownerHeir.nextTakeOverTime();

    return {
      ownerHeir,
      owner,
      heir,
      otherAccount,
      nextTakeOverTime,
      initialDeposit,
    };
  }

  describe("Deployment", function () {
    it("Should set the right owner and heir", async function () {
      const { ownerHeir, owner, heir } = await loadFixture(deployOwnerHeir);

      expect(await ownerHeir.owner()).to.equal(owner.address);
      expect(await ownerHeir.heir()).to.equal(heir.address);
    });

    it("Should set the right nextTakeOverTime", async function () {
      const { nextTakeOverTime } = await loadFixture(deployOwnerHeir);
      const expectedTakeOverTime = (await time.latest()) + 60 * 60 * 24 * 30;

      expect(nextTakeOverTime).to.equal(expectedTakeOverTime);
    });

    it("Should receive and store the initial funds", async function () {
      const { ownerHeir, initialDeposit } = await loadFixture(deployOwnerHeir);

      expect(await ethers.provider.getBalance(ownerHeir.target)).to.equal(
        initialDeposit
      );
    });
  });

  describe("Withdrawals", function () {
    describe("Validations", function () {
      it("Should revert if not called by the owner", async function () {
        const { ownerHeir, otherAccount, initialDeposit } = await loadFixture(
          deployOwnerHeir
        );

        await expect(
          ownerHeir.connect(otherAccount).withdraw(initialDeposit)
        ).to.be.revertedWith("Only owner can withdraw");
      });

      it("Should revert if withdraw amount exceeds balance", async function () {
        const { ownerHeir, initialDeposit } = await loadFixture(
          deployOwnerHeir
        );

        await expect(ownerHeir.withdraw(initialDeposit + 1)).to.be.revertedWith(
          "Failed to withdraw"
        );
      });
    });

    describe("Transfers", function () {
      it("Should transfer the funds to the owner", async function () {
        const { ownerHeir, initialDeposit, owner } = await loadFixture(
          deployOwnerHeir
        );

        const currentTakeOverTime = await ownerHeir.nextTakeOverTime();

        await expect(ownerHeir.withdraw(initialDeposit)).to.changeEtherBalances(
          [owner, ownerHeir],
          [initialDeposit, -initialDeposit]
        );

        expect(await ownerHeir.nextTakeOverTime()).to.be.greaterThan(
          currentTakeOverTime
        );
      });

      it("Should reset nextTakeOverTime if withdraws 0", async function () {
        const { ownerHeir, owner } = await loadFixture(deployOwnerHeir);

        const currentTakeOverTime = await ownerHeir.nextTakeOverTime();

        await expect(ownerHeir.withdraw(0)).to.changeEtherBalances(
          [owner, ownerHeir],
          [0, 0]
        );

        expect(await ownerHeir.nextTakeOverTime()).to.be.greaterThan(
          currentTakeOverTime
        );
      });
    });
  });

  describe("TakeOver", function () {
    describe("Validations", function () {
      it("Should revert if called too soon", async function () {
        const { ownerHeir, heir, otherAccount } = await loadFixture(
          deployOwnerHeir
        );

        await expect(
          ownerHeir.connect(heir).takeOver(otherAccount)
        ).to.be.revertedWith("Too soon");
      });

      it("Should revert if not called by the heir", async function () {
        const { ownerHeir, otherAccount, nextTakeOverTime } = await loadFixture(
          deployOwnerHeir
        );

        await time.increaseTo(nextTakeOverTime + BigInt(1));

        await expect(
          ownerHeir.connect(otherAccount).takeOver(otherAccount)
        ).to.be.revertedWith("Only heir can take over");
      });

      it("Should revert if new heir address is empty", async function () {
        const { ownerHeir, heir, nextTakeOverTime } = await loadFixture(
          deployOwnerHeir
        );

        await time.increaseTo(nextTakeOverTime + BigInt(1));

        await expect(
          ownerHeir.connect(heir).takeOver(hre.ethers.ZeroAddress)
        ).to.be.revertedWith("Invalid heir address");
      });
    });

    describe("TakeOver", function () {
      it("Should allow the heir to take over", async function () {
        const { ownerHeir, heir, nextTakeOverTime, otherAccount } =
          await loadFixture(deployOwnerHeir);

        await time.increaseTo(nextTakeOverTime + BigInt(1));

        await ownerHeir.connect(heir).takeOver(otherAccount);

        expect(await ownerHeir.owner()).to.equal(heir.address);
        expect(await ownerHeir.heir()).to.equal(otherAccount.address);
      });

      it("Should reset nextTakeOverTime during take over", async function () {
        const { ownerHeir, heir, nextTakeOverTime, otherAccount } =
          await loadFixture(deployOwnerHeir);

        const currentTakeOverTime = await ownerHeir.nextTakeOverTime();

        await time.increaseTo(nextTakeOverTime + BigInt(1));

        await ownerHeir.connect(heir).takeOver(otherAccount);

        expect(await ownerHeir.nextTakeOverTime()).to.be.greaterThan(
          currentTakeOverTime
        );
      });
    });
  });
});
