import { BigNumber } from "ethers";
import { render, screen, waitFor } from "testing";
import {
  buildAbiDefinedPureFunction,
  buildAddress,
  buildInput,
  buildInputList,
} from "testing/factory";
import { PartialProps } from "testing/types";
import type { Mock } from "vitest";
import { useContractRead } from "wagmi";
import { Pure } from ".";

vi.mock("wagmi");

const useContractReadMock = useContractRead as Mock;

useContractReadMock.mockReturnValue({
  data: undefined,
  isLoading: false,
  isError: false,
  refetch: vi.fn(),
});

const renderPure = (props: PartialProps<typeof Pure> = {}) => {
  return render(
    <Pure
      address={props.address || buildAddress()}
      func={props.func || buildAbiDefinedPureFunction()}
      initialCollapsed={props.initialCollapsed || false}
    />
  );
};

describe("Pure", () => {
  it("should not render inputs when initialCollapsed is true", () => {
    const inputs = buildInputList(2);
    const func = buildAbiDefinedPureFunction({ inputs });

    renderPure({ func, initialCollapsed: true });

    func.inputs.forEach((input) => {
      expect(screen.queryByLabelText(input.name!)).not.toBeInTheDocument();
    });
  });

  it("should render function name", () => {
    const func = buildAbiDefinedPureFunction();

    renderPure({ func });

    expect(screen.getByText(func.name, { exact: false })).toBeInTheDocument();
  });

  it("should render function inputs", () => {
    const inputs = buildInputList(2);
    const func = buildAbiDefinedPureFunction({ inputs });

    renderPure({ func });

    func.inputs.forEach((input) => {
      expect(screen.getByLabelText(input.name!)).toBeInTheDocument();
    });
  });

  it("should refetch on read button click", () => {
    const refetch = vi.fn();
    useContractReadMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
      refetch,
    });

    renderPure();

    screen.getByText("read").click();

    expect(refetch).toHaveBeenCalled();
  });

  it("should render data when data is defined", () => {
    const data = "foo";
    useContractReadMock.mockReturnValue({
      data,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    });

    renderPure();

    expect(screen.getByText(data)).toBeInTheDocument();
  });

  it("should render loading when isLoading is true", () => {
    useContractReadMock.mockReturnValue({
      data: undefined,
      isLoading: true,
      isError: false,
      refetch: vi.fn(),
    });

    renderPure();

    expect(screen.getByText("loading...")).toBeInTheDocument();
  });

  it("should render error when isError is true", () => {
    useContractReadMock.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: vi.fn(),
    });

    renderPure();

    expect(screen.getByText("Error")).toBeInTheDocument();
  });

  it("should call contract read with provided arguments", async () => {
    const address = buildAddress();
    const func = buildAbiDefinedPureFunction({ inputs: buildInputList(2) });

    const { user } = renderPure({ address, func });

    const firstInput = screen.getByLabelText(func.inputs[0].name!);
    await user.type(firstInput, "first");

    const secondInput = screen.getByLabelText(func.inputs[1].name!);
    await user.type(secondInput, "second");

    await waitFor(() => {
      expect(useContractReadMock).toHaveBeenCalledWith({
        abi: [func],
        address,
        args: ["first", "second"],
        functionName: func.name,
        watch: true,
      });
    });
  });

  it("should call contract read with formatted arguments", async () => {
    const address = buildAddress();
    const input1 = buildInput({ type: "uint256" });
    const input2 = buildInput({ type: "uint256" });
    const func = buildAbiDefinedPureFunction({ inputs: [input1, input2] });

    const { user } = renderPure({ address, func });

    const firstInput = screen.getByLabelText(func.inputs[0].name!);
    await user.type(firstInput, "1");

    const secondInput = screen.getByLabelText(func.inputs[1].name!);
    await user.type(secondInput, "2");

    await waitFor(() => {
      expect(useContractReadMock).toHaveBeenCalledWith({
        abi: [func],
        address,
        args: [BigNumber.from("1"), BigNumber.from("2")],
        functionName: func.name,
        watch: true,
      });
    });
  });
});
